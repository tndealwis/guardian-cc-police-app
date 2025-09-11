const z = require("zod");
const LostItemModel = require("../models/lost-item.model");
const ReportImagesModel = require("../models/report-images.model");
const personalDetailsService = require("./personal-details.service");

class LostArticleService {
  articleValidation = z.object({
    name: z.string(),
    description: z.string(),
    serial_number: z.string().optional(),
    color: z.string().optional(),
    model: z.string().optional(),
  });

  /**
   * @returns {Promise<LostItemModel>}
   */
  async create(files, body, user_id) {
    const { name, description, serial_number, color, model } =
      this.articleValidation.parse(body);
    const lostArticle = new LostItemModel(
      name,
      description,
      serial_number,
      color,
      model,
      user_id,
    );

    await lostArticle.save();

    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        new ReportImagesModel(lostArticle.id, file.path).save();
      }
    }

    return lostArticle;
  }

  /**
   * @param {number} id
   * @param {number} user_id
   * @param {boolean} [is_officer=false]
   * @returns {Promise<LostItemModel | null>}
   */
  async getById(id, user_id, is_officer = false) {
    const result = is_officer
      ? await LostItemModel.findById(id)
      : await LostItemModel.findBy(["id", "user_id"], [id, user_id]);

    if (result !== null) {
      const personalDetails =
        await personalDetailsService.findByLostArticleId(id);
      result.personal_details = personalDetails.data;
    }

    return result;
  }

  /**
   * @param {number} [limit=100]
   * @returns {Promise<LostItemModel[]>}
   */
  async getAll(limit = 100) {
    return await LostItemModel.all(limit);
  }

  /**
   * @param {number} id
   * @param {number} user_id
   * @param {boolean} [is_officer=false]
   */
  async canModify(id, user_id, is_officer = false) {
    if (is_officer) {
      return true;
    }

    const lostArticle = await LostItemModel.findById(id);

    if (lostArticle && lostArticle.user_id === user_id) {
      return true;
    }
  }
}

const lostArticleService = new LostArticleService();

module.exports = lostArticleService;
